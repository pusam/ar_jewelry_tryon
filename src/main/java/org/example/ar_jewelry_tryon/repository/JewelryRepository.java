package org.example.ar_jewelry_tryon.repository;

import org.example.ar_jewelry_tryon.model.Jewelry;
import org.example.ar_jewelry_tryon.model.JewelryType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface JewelryRepository extends JpaRepository<Jewelry, Long> {
    List<Jewelry> findByType(JewelryType type);
}
