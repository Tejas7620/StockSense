package com.stocksense.controller;

import com.stocksense.dto.ApiResponse;
import com.stocksense.dto.PagedResponse;
import com.stocksense.dto.inventory.DocumentResponse;
import com.stocksense.entity.MoveStatus;
import com.stocksense.entity.OperationType;
import com.stocksense.service.OperationService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

/**
 * Stock Ledger — read-only view over the same StockMove table,
 * with different filters/grouping. Every completed stock-affecting
 * operation appears here.
 */
@RestController
@RequestMapping({"/api/v1/moves", "/api/v1/stock-moves"})
@RequiredArgsConstructor
public class MovesController {

    private final OperationService operationService;

    @GetMapping
    public ResponseEntity<ApiResponse<PagedResponse<DocumentResponse>>> listMoves(
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Long productId,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        size = Math.min(size, 100);
        Pageable pageable = PageRequest.of(page, size);

        OperationType opType = type != null ? OperationType.valueOf(type.toUpperCase()) : null;
        MoveStatus moveStatus = status != null ? MoveStatus.valueOf(status.toUpperCase()) : null;

        Page<DocumentResponse> result = operationService.listLedger(opType, moveStatus, productId, search, pageable);

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
    public ResponseEntity<ApiResponse<DocumentResponse>> getMove(@PathVariable UUID documentId) {
        return ResponseEntity.ok(ApiResponse.success(
                operationService.getLedgerDocument(documentId)));
    }
}
