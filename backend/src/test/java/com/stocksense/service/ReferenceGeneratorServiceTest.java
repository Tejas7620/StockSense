package com.stocksense.service;

import com.stocksense.entity.OperationType;
import com.stocksense.entity.SequenceCounter;
import com.stocksense.entity.Warehouse;
import com.stocksense.repository.SequenceCounterRepository;
import com.stocksense.repository.WarehouseRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import com.stocksense.repository.LocationRepository;
import com.stocksense.repository.StockMoveRepository;
import com.stocksense.repository.StockRepository;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
class ReferenceGeneratorServiceTest {

    @Autowired
    private ReferenceGeneratorService referenceGeneratorService;

    @Autowired
    private WarehouseRepository warehouseRepository;

    @Autowired
    private LocationRepository locationRepository;

    @Autowired
    private StockRepository stockRepository;

    @Autowired
    private StockMoveRepository stockMoveRepository;

    @Autowired
    private SequenceCounterRepository sequenceCounterRepository;

    private Warehouse warehouse;

    @BeforeEach
    void setUp() {
        sequenceCounterRepository.deleteAll();
        stockMoveRepository.deleteAll();
        stockRepository.deleteAll();
        locationRepository.deleteAll();
        warehouseRepository.deleteAll();

        warehouse = warehouseRepository.save(Warehouse.builder()
                .name("Test Warehouse")
                .code("TW")
                .active(true)
                .build());
    }

    @Test
    @DisplayName("Should generate sequential references")
    @Transactional
    void shouldGenerateSequentialReferences() {
        String ref1 = referenceGeneratorService.generate(OperationType.RECEIPT, warehouse);
        String ref2 = referenceGeneratorService.generate(OperationType.RECEIPT, warehouse);
        String ref3 = referenceGeneratorService.generate(OperationType.RECEIPT, warehouse);

        assertEquals("TW/IN/0001", ref1);
        assertEquals("TW/IN/0002", ref2);
        assertEquals("TW/IN/0003", ref3);
    }

    @Test
    @DisplayName("Should use different counters per direction code")
    @Transactional
    void shouldUseDifferentCountersPerDirection() {
        String receipt = referenceGeneratorService.generate(OperationType.RECEIPT, warehouse);
        String delivery = referenceGeneratorService.generate(OperationType.DELIVERY, warehouse);
        String transfer = referenceGeneratorService.generate(OperationType.INTERNAL, warehouse);
        String adjustment = referenceGeneratorService.generate(OperationType.ADJUSTMENT, warehouse);

        assertEquals("TW/IN/0001", receipt);
        assertEquals("TW/OUT/0001", delivery);
        assertEquals("TW/INT/0001", transfer);
        assertEquals("TW/ADJ/0001", adjustment);
    }

    @Test
    @DisplayName("Should produce correct format with warehouse code")
    @Transactional
    void shouldUseWarehouseCodeInReference() {
        Warehouse wh2 = warehouseRepository.save(Warehouse.builder()
                .name("Second Warehouse")
                .code("WH2")
                .active(true)
                .build());

        String ref = referenceGeneratorService.generate(OperationType.RECEIPT, wh2);
        assertEquals("WH2/IN/0001", ref);
    }

    @Test
    @DisplayName("Should generate many sequential references without gaps")
    @Transactional
    void shouldGenerateManySequentialReferences() {
        // Test that 20 sequential calls produce unique, gapless references
        for (int i = 1; i <= 20; i++) {
            String ref = referenceGeneratorService.generate(OperationType.RECEIPT, warehouse);
            assertEquals(String.format("TW/IN/%04d", i), ref,
                    "Reference #" + i + " should match expected format");
        }
    }

    @Test
    @DisplayName("Should resume counter after pre-seeded value")
    @Transactional
    void shouldResumeCounterAfterPreSeededValue() {
        // Pre-seed a counter at value 42
        sequenceCounterRepository.save(SequenceCounter.builder()
                .warehouseId(warehouse.getId())
                .directionCode("IN")
                .lastValue(42L)
                .build());

        String ref = referenceGeneratorService.generate(OperationType.RECEIPT, warehouse);
        assertEquals("TW/IN/0043", ref, "Should resume from pre-seeded value");
    }

    @Test
    @DisplayName("Different warehouses should have independent counters")
    @Transactional
    void shouldHaveIndependentCountersPerWarehouse() {
        Warehouse wh2 = warehouseRepository.save(Warehouse.builder()
                .name("Second Warehouse")
                .code("WH2")
                .active(true)
                .build());

        // Generate 3 for warehouse 1
        referenceGeneratorService.generate(OperationType.RECEIPT, warehouse);
        referenceGeneratorService.generate(OperationType.RECEIPT, warehouse);
        referenceGeneratorService.generate(OperationType.RECEIPT, warehouse);

        // Generate 1 for warehouse 2 — should start at 0001, not 0004
        String ref = referenceGeneratorService.generate(OperationType.RECEIPT, wh2);
        assertEquals("WH2/IN/0001", ref, "Second warehouse should have its own counter");
    }
}
