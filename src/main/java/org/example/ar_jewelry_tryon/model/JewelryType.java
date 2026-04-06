package org.example.ar_jewelry_tryon.model;

public enum JewelryType {
    RING("반지"),
    NECKLACE("목걸이"),
    BRACELET("팔찌");

    private final String displayName;

    JewelryType(String displayName) {
        this.displayName = displayName;
    }

    public String getDisplayName() {
        return displayName;
    }
}
