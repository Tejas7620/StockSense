package com.stocksense.service;

import com.stocksense.dto.inventory.ProductRequest;
import com.stocksense.dto.inventory.ProductResponse;
import com.stocksense.entity.Category;
import com.stocksense.entity.Product;
import com.stocksense.exception.DuplicateSkuException;
import com.stocksense.exception.ResourceNotFoundException;
import com.stocksense.mapper.InventoryMapper;
import com.stocksense.repository.CategoryRepository;
import com.stocksense.repository.ProductRepository;
import com.stocksense.repository.StockRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ProductService {

    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;
    private final StockRepository stockRepository;
    private final AuditService auditService;

    @Transactional(readOnly = true)
    public Page<ProductResponse> getAllProducts(String search, Long categoryId, Pageable pageable) {
        Page<Product> products;

        if (search != null && !search.isBlank()) {
            products = productRepository.searchByNameOrSku(search, pageable);
        } else if (categoryId != null) {
            products = productRepository.findByCategoryId(categoryId, pageable);
        } else {
            products = productRepository.findAll(pageable);
        }

        List<ProductResponse> responses = products.getContent().stream()
                .map(p -> {
                    int totalStock = stockRepository.sumQuantityOnHandByProductId(p.getId());
                    return InventoryMapper.toProductResponse(p, totalStock);
                })
                .collect(Collectors.toList());

        return new PageImpl<>(responses, pageable, products.getTotalElements());
    }

    @Transactional(readOnly = true)
    public ProductResponse getProduct(Long id) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Product", "id", id));
        int totalStock = stockRepository.sumQuantityOnHandByProductId(id);
        return InventoryMapper.toProductResponse(product, totalStock);
    }

    @Transactional
    public ProductResponse createProduct(ProductRequest request) {
        if (productRepository.existsBySku(request.getSku())) {
            throw new DuplicateSkuException(request.getSku());
        }

        Category category = categoryRepository.findById(request.getCategoryId())
                .orElseThrow(() -> new ResourceNotFoundException("Category", "id", request.getCategoryId()));

        Product product = Product.builder()
                .name(request.getName())
                .sku(request.getSku())
                .category(category)
                .unitOfMeasure(request.getUnitOfMeasure())
                .unitCost(request.getUnitCost())
                .reorderLevel(request.getReorderLevel() != null ? request.getReorderLevel() : 0)
                .active(true)
                .build();

        product = productRepository.save(product);
        String userEmail = getCurrentUserEmail();
        auditService.record("CREATE_PRODUCT", "PRODUCT", product.getId().toString(), userEmail,
                "Created product " + product.getSku() + " - " + product.getName());
        log.info("Created product: {} ({})", product.getName(), product.getSku());
        return InventoryMapper.toProductResponse(product, 0);
    }

    @Transactional
    public ProductResponse updateProduct(Long id, ProductRequest request) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Product", "id", id));

        // Check SKU uniqueness if changed
        if (!product.getSku().equals(request.getSku()) && productRepository.existsBySku(request.getSku())) {
            throw new DuplicateSkuException(request.getSku());
        }

        Category category = categoryRepository.findById(request.getCategoryId())
                .orElseThrow(() -> new ResourceNotFoundException("Category", "id", request.getCategoryId()));

        product.setName(request.getName());
        product.setSku(request.getSku());
        product.setCategory(category);
        product.setUnitOfMeasure(request.getUnitOfMeasure());
        product.setUnitCost(request.getUnitCost());
        product.setReorderLevel(request.getReorderLevel() != null ? request.getReorderLevel() : 0);

        product = productRepository.save(product);
        int totalStock = stockRepository.sumQuantityOnHandByProductId(id);
        String userEmail = getCurrentUserEmail();
        auditService.record("UPDATE_PRODUCT", "PRODUCT", product.getId().toString(), userEmail,
                "Updated product " + product.getSku());
        log.info("Updated product: {} ({})", product.getName(), product.getSku());
        return InventoryMapper.toProductResponse(product, totalStock);
    }

    @Transactional
    public void deleteProduct(Long id) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Product", "id", id));

        // Prefer deactivation over deletion when historical moves exist
        product.setActive(false);
        productRepository.save(product);
        String userEmail = getCurrentUserEmail();
        auditService.record("DELETE_PRODUCT", "PRODUCT", product.getId().toString(), userEmail,
                "Deactivated product " + product.getSku());
        log.info("Deactivated product: {} ({})", product.getName(), product.getSku());
    }

    private String getCurrentUserEmail() {
        try {
            org.springframework.security.core.Authentication auth =
                    org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.isAuthenticated() && !"anonymousUser".equals(auth.getName())) {
                return auth.getName();
            }
        } catch (Exception ignored) {}
        return "system";
    }
}
