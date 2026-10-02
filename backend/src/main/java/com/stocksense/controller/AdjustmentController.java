package com.stocksense.controller;

import com.stocksense.dto.ApiResponse;
import com.stocksense.dto.PagedResponse;
import com.stocksense.dto.inventory.AdjustmentRequest;
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
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/adjustments")
@RequiredArgsConstructor
public class AdjustmentController {

    private final OperationService operationService;
    private final UserRepository userRepository;

    @GetMapping
    public ResponseEntity<ApiResponse<PagedResponse<DocumentResponse>>> listAdjustments(
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        size = Math.min(size, 100);
        Pageable pageable = PageRequest.of(page, size);
        MoveStatus moveStatus = status != null ? MoveStatus.valueOf(status.toUpperCase()) : null;
        Page<DocumentResponse> result = operationService.listDocuments(OperationType.ADJUSTMENT, moveStatus, pageable);

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
    public ResponseEntity<ApiResponse<DocumentResponse>> getAdjustment(@PathVariable UUID documentId) {
        return ResponseEntity.ok(ApiResponse.success(
                operationService.getDocument(documentId, OperationType.ADJUSTMENT)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<DocumentResponse>> createAdjustment(
            @Valid @RequestBody AdjustmentRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        User user = getCurrentUser(userDetails);
        DocumentResponse response = operationService.createAdjustment(request, user);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.created(response));
    }

    /**
     * Validate adjustment — MANAGER only.
     * Enforced with @PreAuthorize AND service-layer check.
     */
    @RequestMapping(value = "/{documentId}/validate", method = {RequestMethod.POST, RequestMethod.PATCH})
    @PreAuthorize("hasRole('MANAGER')")
    public ResponseEntity<ApiResponse<DocumentResponse>> validateAdjustment(
            @PathVariable UUID documentId,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        User user = getCurrentUser(userDetails);
        return ResponseEntity.ok(ApiResponse.success(
                operationService.validateAdjustment(documentId, user)));
    }

    @PatchMapping("/{documentId}/cancel")
    public ResponseEntity<ApiResponse<DocumentResponse>> cancelAdjustment(@PathVariable UUID documentId) {
        return ResponseEntity.ok(ApiResponse.success(
                operationService.cancelDocument(documentId, OperationType.ADJUSTMENT)));
    }

    private User getCurrentUser(CustomUserDetails userDetails) {
        return userRepository.findById(userDetails.getUserId())
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userDetails.getUserId()));
    }
}
