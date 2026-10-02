package com.stocksense.dto.inventory;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class AdjustmentLineRequest {

    @NotNull(message = "Product ID is required")
    private Long productId;

    @NotNull(message = "Physical quantity is required")
    @Min(value = 0, message = "Physical quantity must be >= 0")
    @JsonAlias({"countedQuantity", "quantity", "physicalCount"})
    private Integer physicalQuantity;
}
