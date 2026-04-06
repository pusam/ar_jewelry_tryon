package org.example.ar_jewelry_tryon.config;

import org.example.ar_jewelry_tryon.model.Jewelry;
import org.example.ar_jewelry_tryon.model.JewelryType;
import org.example.ar_jewelry_tryon.repository.JewelryRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class DataInitializer {

    @Bean
    CommandLineRunner initData(JewelryRepository repo) {
        return args -> {
            if (repo.count() > 0) return;

            Jewelry j1 = new Jewelry("골드 트위스트 반지", "18K 골드 트위스트 디자인 반지",
                    JewelryType.RING,
                    "/uploads/ring_product_1.png",
                    "/uploads/ring_overlay_1.png",
                    189000, "JEWELY", "#");
            j1.setModelUrl("/uploads/ring_gold_twist.glb");
            repo.save(j1);

            Jewelry j2 = new Jewelry("실버 큐빅 반지", "스털링 실버 큐빅 지르코니아 반지",
                    JewelryType.RING,
                    "/uploads/ring_product_2.png",
                    "/uploads/ring_overlay_2.png",
                    89000, "JEWELY", "#");
            j2.setModelUrl("/uploads/ring_silver_cubic.glb");
            repo.save(j2);

            Jewelry j3 = new Jewelry("로즈골드 체인 목걸이", "14K 로즈골드 체인 펜던트 목걸이",
                    JewelryType.NECKLACE,
                    "/uploads/necklace_product_1.png",
                    "/uploads/necklace_overlay_1.png",
                    250000, "JEWELY", "#");
            j3.setModelUrl("/uploads/necklace_rosegold_heart.glb");
            repo.save(j3);

            Jewelry j4 = new Jewelry("진주 드롭 목걸이", "담수진주 드롭 디자인 목걸이",
                    JewelryType.NECKLACE,
                    "/uploads/necklace_product_2.png",
                    "/uploads/necklace_overlay_2.png",
                    320000, "JEWELY", "#");
            j4.setModelUrl("/uploads/necklace_pearl_drop.glb");
            repo.save(j4);

            Jewelry j5 = new Jewelry("골드 체인 팔찌", "18K 골드 미니멀 체인 팔찌",
                    JewelryType.BRACELET,
                    "/uploads/bracelet_overlay_1.png",
                    "/uploads/bracelet_overlay_1.png",
                    210000, "JEWELY", "#");
            j5.setModelUrl("/uploads/bracelet_gold_chain.glb");
            repo.save(j5);

            Jewelry j6 = new Jewelry("실버 뱅글 팔찌", "스털링 실버 오픈형 뱅글 팔찌",
                    JewelryType.BRACELET,
                    "/uploads/bracelet_overlay_1.png",
                    "/uploads/bracelet_overlay_1.png",
                    150000, "JEWELY", "#");
            j6.setModelUrl("/uploads/bracelet_silver_bangle.glb");
            repo.save(j6);
        };
    }
}
