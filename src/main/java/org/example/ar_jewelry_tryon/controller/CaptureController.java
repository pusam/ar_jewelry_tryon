package org.example.ar_jewelry_tryon.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api")
public class CaptureController {

    private static final String CAPTURE_DIR = "uploads/captures/";

    @PostMapping("/capture")
    public ResponseEntity<Map<String, String>> capture(@RequestParam("image") MultipartFile image) throws IOException {
        Path dir = Paths.get(CAPTURE_DIR);
        if (!Files.exists(dir)) {
            Files.createDirectories(dir);
        }

        String filename = "ar-jewelry-" + UUID.randomUUID().toString().substring(0, 8) + ".png";
        Files.copy(image.getInputStream(), dir.resolve(filename));

        return ResponseEntity.ok(Map.of(
                "url", "/uploads/captures/" + filename,
                "filename", filename
        ));
    }
}
