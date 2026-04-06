package org.example.ar_jewelry_tryon.controller;

import org.example.ar_jewelry_tryon.model.Jewelry;
import org.example.ar_jewelry_tryon.model.JewelryType;
import org.example.ar_jewelry_tryon.repository.JewelryRepository;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;

import java.util.List;

@Controller
public class JewelryController {

    private final JewelryRepository jewelryRepository;

    public JewelryController(JewelryRepository jewelryRepository) {
        this.jewelryRepository = jewelryRepository;
    }

    @GetMapping("/")
    public String catalog(@RequestParam(required = false) String type, Model model) {
        List<Jewelry> items;
        if (type != null && !type.isEmpty()) {
            items = jewelryRepository.findByType(JewelryType.valueOf(type.toUpperCase()));
        } else {
            items = jewelryRepository.findAll();
        }
        model.addAttribute("items", items);
        model.addAttribute("types", JewelryType.values());
        model.addAttribute("selectedType", type);
        return "catalog";
    }

    @GetMapping("/tryon/{id}")
    public String tryOn(@PathVariable Long id, Model model) {
        Jewelry jewelry = jewelryRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("상품을 찾을 수 없습니다: " + id));
        model.addAttribute("jewelry", jewelry);
        return "tryon";
    }

    @GetMapping("/product/{id}")
    public String productDetail(@PathVariable Long id, Model model) {
        Jewelry jewelry = jewelryRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("상품을 찾을 수 없습니다: " + id));
        model.addAttribute("jewelry", jewelry);
        return "product";
    }
}
