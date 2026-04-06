package org.example.ar_jewelry_tryon.controller;

import org.example.ar_jewelry_tryon.model.Jewelry;
import org.example.ar_jewelry_tryon.model.JewelryType;
import org.example.ar_jewelry_tryon.repository.JewelryRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/jewelry")
public class JewelryApiController {

    private final JewelryRepository jewelryRepository;

    public JewelryApiController(JewelryRepository jewelryRepository) {
        this.jewelryRepository = jewelryRepository;
    }

    @GetMapping
    public List<Jewelry> getAll(@RequestParam(required = false) String type) {
        if (type != null && !type.isEmpty()) {
            return jewelryRepository.findByType(JewelryType.valueOf(type.toUpperCase()));
        }
        return jewelryRepository.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Jewelry> getById(@PathVariable Long id) {
        return jewelryRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
}
