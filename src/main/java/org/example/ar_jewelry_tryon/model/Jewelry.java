package org.example.ar_jewelry_tryon.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "jewelry")
@Getter @Setter @NoArgsConstructor
public class Jewelry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;

    private String description;

    @Enumerated(EnumType.STRING)
    private JewelryType type; // RING, NECKLACE, BRACELET

    private String imageUrl;      // 상품 이미지
    private String overlayUrl;    // AR 오버레이용 PNG (투명배경)
    private String modelUrl;      // 3D 모델 GLB (있으면 3D로 렌더링)

    private int price;

    private String brand;

    private String externalUrl;   // 원본 쇼핑몰 링크

    public Jewelry(String name, String description, JewelryType type,
                   String imageUrl, String overlayUrl, int price, String brand, String externalUrl) {
        this.name = name;
        this.description = description;
        this.type = type;
        this.imageUrl = imageUrl;
        this.overlayUrl = overlayUrl;
        this.price = price;
        this.brand = brand;
        this.externalUrl = externalUrl;
    }
}
