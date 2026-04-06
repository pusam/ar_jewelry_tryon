package org.example.ar_jewelry_tryon.controller;

import org.example.ar_jewelry_tryon.model.Jewelry;
import org.example.ar_jewelry_tryon.model.JewelryType;
import org.example.ar_jewelry_tryon.repository.JewelryRepository;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.UUID;

@Controller
@RequestMapping("/admin")
public class AdminController {

    private final JewelryRepository jewelryRepository;
    private static final String UPLOAD_DIR = "uploads/";

    public AdminController(JewelryRepository jewelryRepository) {
        this.jewelryRepository = jewelryRepository;
    }

    @GetMapping
    public String adminPage(Model model) {
        model.addAttribute("items", jewelryRepository.findAll());
        model.addAttribute("types", JewelryType.values());
        return "admin";
    }

    @PostMapping("/add")
    public String addJewelry(@RequestParam String name,
                             @RequestParam String description,
                             @RequestParam JewelryType type,
                             @RequestParam int price,
                             @RequestParam String brand,
                             @RequestParam(defaultValue = "#") String externalUrl,
                             @RequestParam("productImage") MultipartFile productImage,
                             @RequestParam(value = "overlayImage", required = false) MultipartFile overlayImage,
                             @RequestParam(value = "modelFile", required = false) MultipartFile modelFile) throws IOException {

        String productPath = saveFile(productImage, "product");

        String overlayPath = "";
        if (overlayImage != null && !overlayImage.isEmpty()) {
            overlayPath = saveFile(overlayImage, "overlay");
        }

        String modelPath = "";
        if (modelFile != null && !modelFile.isEmpty()) {
            modelPath = saveFile(modelFile, "model");
        }

        Jewelry jewelry = new Jewelry(name, description, type,
                "/uploads/" + productPath,
                overlayPath.isEmpty() ? "" : "/uploads/" + overlayPath,
                price, brand, externalUrl);
        if (!modelPath.isEmpty()) {
            jewelry.setModelUrl("/uploads/" + modelPath);
        }
        jewelryRepository.save(jewelry);

        return "redirect:/admin";
    }

    @PostMapping("/delete/{id}")
    public String deleteJewelry(@PathVariable Long id) {
        jewelryRepository.deleteById(id);
        return "redirect:/admin";
    }

    private String saveFile(MultipartFile file, String prefix) throws IOException {
        Path uploadPath = Paths.get(UPLOAD_DIR);
        if (!Files.exists(uploadPath)) {
            Files.createDirectories(uploadPath);
        }
        String filename = prefix + "_" + UUID.randomUUID() + "_" + file.getOriginalFilename();
        Files.copy(file.getInputStream(), uploadPath.resolve(filename));
        return filename;
    }
}
