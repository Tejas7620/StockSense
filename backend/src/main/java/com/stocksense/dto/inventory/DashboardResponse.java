package com.stocksense.dto.inventory;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

/**
 * Aggregated dashboard response — one endpoint, no multiple round trips.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DashboardResponse {
    private Long totalProducts;
    private Long totalStock;
    private BigDecimal totalStockValue;
    private Long lowStockCount;
    private Long outOfStockCount;
    private Long lowStockProducts;
    private Long outOfStockProducts;
    private Long pendingReceipts;
    private Long pendingDeliveries;
    private Long pendingTransfers;
    private Long pendingAdjustments;
    private List<DocumentResponse> recentMovements;
    private List<LowStockItem> lowStockItems;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class LowStockItem {
        private Long productId;
        private String productName;
        private String sku;
        private String locationName;
        private String warehouseName;
        private Integer quantityOnHand;
        private Integer reorderLevel;
        private String status;
    }
}
