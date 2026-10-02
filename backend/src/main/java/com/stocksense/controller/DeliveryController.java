package com.stocksense.controller;

import com.stocksense.dto.ApiResponse;
import com.stocksense.dto.PagedResponse;
import com.stocksense.dto.inventory.DeliveryRequest;
import com.stocksense.dto.inventory.DocumentResponse;
import com.stocksense.entity.MoveStatus;
import com.stocksense.entity.OperationType;
import com.stocksense.entity.User;
import com.stocksense.exception.ResourceNotFoundException;
import com.stocksense.repository.UserRepository;
import com.stocksense.security.CustomUserDetails;
import com.stocksense.service.OperationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/deliveries")
@RequiredArgsConstructor
public class DeliveryController {

    private final OperationService operationService;
    private final UserRepository userRepository;

    @GetMapping
    public ResponseEntity<ApiResponse<PagedResponse<DocumentResponse>>> listDeliveries(
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        size = Math.min(size, 100);
        Pageable pageable = PageRequest.of(page, size);
        MoveStatus moveStatus = status != null ? MoveStatus.valueOf(status.toUpperCase()) : null;
        Page<DocumentResponse> result = operationService.listDocuments(OperationType.DELIVERY, moveStatus, pageable);

        PagedResponse<DocumentResponse> paged = PagedResponse.<DocumentResponse>builder()
                .content(result.getContent())
                .page(result.getNumber())
                .size(result.getSize())
                .totalElements(result.getTotalElements())
                .totalPages(result.getTotalPages())
                .build();

        return ResponseEntity.ok(ApiResponse.success(paged));
    }

    @GetMapping("/{documentId}")
    public ResponseEntity<ApiResponse<DocumentResponse>> getDelivery(@PathVariable UUID documentId) {
        return ResponseEntity.ok(ApiResponse.success(
                operationService.getDocument(documentId, OperationType.DELIVERY)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<DocumentResponse>> createDelivery(
            @Valid @RequestBody DeliveryRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        User user = getCurrentUser(userDetails);
        DocumentResponse response = operationService.createDelivery(request, user);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.created(response));
    }

    @PutMapping("/{documentId}")
    public ResponseEntity<ApiResponse<DocumentResponse>> updateDelivery(
            @PathVariable UUID documentId,
            @Valid @RequestBody DeliveryRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        User user = getCurrentUser(userDetails);
        return ResponseEntity.ok(ApiResponse.success(
                operationService.updateDelivery(documentId, request, user)));
    }

    @PatchMapping("/{documentId}/check-availability")
    public ResponseEntity<ApiResponse<DocumentResponse>> checkAvailability(@PathVariable UUID documentId) {
        return ResponseEntity.ok(ApiResponse.success(
                operationService.checkDeliveryAvailability(documentId)));
    }

    @RequestMapping(value = "/{documentId}/validate", method = {RequestMethod.POST, RequestMethod.PATCH})
    public ResponseEntity<ApiResponse<DocumentResponse>> validateDelivery(
            @PathVariable UUID documentId,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        User user = getCurrentUser(userDetails);
        return ResponseEntity.ok(ApiResponse.success(
                operationService.validateDelivery(documentId, user)));
    }

    @PatchMapping("/{documentId}/cancel")
    public ResponseEntity<ApiResponse<DocumentResponse>> cancelDelivery(@PathVariable UUID documentId) {
        return ResponseEntity.ok(ApiResponse.success(
                operationService.cancelDocument(documentId, OperationType.DELIVERY)));
    }

    private User getCurrentUser(CustomUserDetails userDetails) {
        return userRepository.findById(userDetails.getUserId())
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userDetails.getUserId()));
    }
}
