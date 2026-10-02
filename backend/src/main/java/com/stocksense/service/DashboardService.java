package com.stocksense.service;

import com.stocksense.dto.inventory.DashboardResponse;
import com.stocksense.dto.inventory.DocumentResponse;
import com.stocksense.entity.*;
import com.stocksense.mapper.InventoryMapper;
import com.stocksense.repository.ProductRepository;
import com.stocksense.repository.StockMoveRepository;
import com.stocksense.repository.StockRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Dashboard aggregation service — one endpoint, all data from PostgreSQL.
 * Uses efficient, targeted queries; does not load the entire movement history.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class DashboardService {

    private final ProductRepository productRepository;
    private final StockRepository stockRepository;
    private final StockMoveRepository stockMoveRepository;

    @Transactional(readOnly = true)
    public DashboardResponse getDashboard() {
        // Total products
        long totalProducts = productRepository.count();

        // Total stock value
        List<Stock> allStock = stockRepository.findAll();
        BigDecimal totalStockValue = allStock.stream()
                .filter(s -> s.getProduct().getUnitCost() != null)
                .map(s -> s.getProduct().getUnitCost()
                        .multiply(BigDecimal.valueOf(s.getQuantityOnHand())))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // Low/out of stock counts
        List<Stock> lowStockItems = stockRepository.findLowStockItems();
        long outOfStockCount = allStock.stream()
                .filter(s -> s.getQuantityOnHand() == 0)
                .count();
        long lowStockCount = lowStockItems.stream()
                .filter(s -> s.getQuantityOnHand() > 0)
                .count();

        List<MoveStatus> excludedStatuses = List.of(MoveStatus.DONE, MoveStatus.CANCELED);

        // Pending documents by type
        long pendingReceipts = stockMoveRepository.countPendingDocumentsByType(OperationType.RECEIPT, excludedStatuses);
        long pendingDeliveries = stockMoveRepository.countPendingDocumentsByType(OperationType.DELIVERY, excludedStatuses);
        long pendingTransfers = stockMoveRepository.countPendingDocumentsByType(OperationType.INTERNAL, excludedStatuses);
        long pendingAdjustments = stockMoveRepository.countPendingDocumentsByType(OperationType.ADJUSTMENT, excludedStatuses);

        // Recent movements (last 10 DONE documents)
        List<UUID> recentDocIds = stockMoveRepository
                .findRecentDoneDocumentIds(MoveStatus.DONE, PageRequest.of(0, 10))
                .getContent();
        List<DocumentResponse> recentMovements = recentDocIds.stream()
                .map(id -> {
                    List<StockMove> moves = stockMoveRepository.findByDocumentId(id);
                    return InventoryMapper.toDocumentResponse(moves);
                })
                .collect(Collectors.toList());

        // Low stock items for "risk" callout
        List<DashboardResponse.LowStockItem> lowItems = lowStockItems.stream()
                .map(stock -> DashboardResponse.LowStockItem.builder()
                        .productId(stock.getProduct().getId())
                        .productName(stock.getProduct().getName())
                        .sku(stock.getProduct().getSku())
                        .locationName(stock.getLocation().getName())
                        .warehouseName(stock.getLocation().getWarehouse().getName())
                        .quantityOnHand(stock.getQuantityOnHand())
                        .reorderLevel(stock.getProduct().getReorderLevel())
                        .status(InventoryMapper.computeStockStatus(
                                stock.getQuantityOnHand(), stock.getProduct().getReorderLevel()))
                        .build())
                .collect(Collectors.toList());

        long totalStock = allStock.stream().mapToLong(Stock::getQuantityOnHand).sum();

        return DashboardResponse.builder()
                .totalProducts(totalProducts)
                .totalStock(totalStock)
                .totalStockValue(totalStockValue)
                .lowStockCount(lowStockCount)
                .outOfStockCount(outOfStockCount)
                .lowStockProducts(lowStockCount)
                .outOfStockProducts(outOfStockCount)
                .pendingReceipts(pendingReceipts)
                .pendingDeliveries(pendingDeliveries)
                .pendingTransfers(pendingTransfers)
                .pendingAdjustments(pendingAdjustments)
                .recentMovements(recentMovements)
                .lowStockItems(lowItems)
                .build();
    }
}
