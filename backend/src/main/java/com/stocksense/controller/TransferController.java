package com.stocksense.controller;

import com.stocksense.dto.ApiResponse;
import com.stocksense.dto.PagedResponse;
import com.stocksense.dto.inventory.DocumentResponse;
import com.stocksense.dto.inventory.TransferRequest;
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
@RequestMapping("/api/v1/transfers")
@RequiredArgsConstructor
public class TransferController {

    private final OperationService operationService;
    private final UserRepository userRepository;

    @GetMapping
    public ResponseEntity<ApiResponse<PagedResponse<DocumentResponse>>> listTransfers(
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        size = Math.min(size, 100);
        Pageable pageable = PageRequest.of(page, size);
        MoveStatus moveStatus = status != null ? MoveStatus.valueOf(status.toUpperCase()) : null;
        Page<DocumentResponse> result = operationService.listDocuments(OperationType.INTERNAL, moveStatus, pageable);

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
    public ResponseEntity<ApiResponse<DocumentResponse>> getTransfer(@PathVariable UUID documentId) {
        return ResponseEntity.ok(ApiResponse.success(
                operationService.getDocument(documentId, OperationType.INTERNAL)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<DocumentResponse>> createTransfer(
            @Valid @RequestBody TransferRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        User user = getCurrentUser(userDetails);
        DocumentResponse response = operationService.createTransfer(request, user);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.created(response));
    }

    @PutMapping("/{documentId}")
    public ResponseEntity<ApiResponse<DocumentResponse>> updateTransfer(
            @PathVariable UUID documentId,
            @Valid @RequestBody TransferRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        User user = getCurrentUser(userDetails);
        return ResponseEntity.ok(ApiResponse.success(
                operationService.updateTransfer(documentId, request, user)));
    }

    @RequestMapping(value = "/{documentId}/validate", method = {RequestMethod.POST, RequestMethod.PATCH})
    public ResponseEntity<ApiResponse<DocumentResponse>> validateTransfer(
            @PathVariable UUID documentId,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        User user = getCurrentUser(userDetails);
        return ResponseEntity.ok(ApiResponse.success(
                operationService.validateTransfer(documentId, user)));
    }

    @PatchMapping("/{documentId}/cancel")
    public ResponseEntity<ApiResponse<DocumentResponse>> cancelTransfer(@PathVariable UUID documentId) {
        return ResponseEntity.ok(ApiResponse.success(
                operationService.cancelDocument(documentId, OperationType.INTERNAL)));
    }

    private User getCurrentUser(CustomUserDetails userDetails) {
        return userRepository.findById(userDetails.getUserId())
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userDetails.getUserId()));
    }
}
