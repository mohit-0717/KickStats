// backend/src/main/java/com/football/entity/Player.java
package com.football.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.SQLDelete;
import org.hibernate.annotations.SQLRestriction;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

/**
 * Player Entity - Represents a football player
 * Uses Lombok for boilerplate reduction
 * Includes audit columns for tracking changes
 * Soft delete support for data integrity
 */
@Entity
@Table(name = "players", indexes = {
        @Index(name = "idx_position", columnList = "position"),
        @Index(name = "idx_nationality", columnList = "nationality"),
        @Index(name = "idx_goals", columnList = "goals"),
        @Index(name = "idx_created_at", columnList = "created_at")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@SQLDelete(sql = "UPDATE players SET deleted_at = CURRENT_TIMESTAMP WHERE player_id = ?")
@SQLRestriction("deleted_at IS NULL")
public class Player {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "player_id")
    private Long playerId;

    @NotBlank(message = "First name is required")
    @Size(min = 2, max = 50, message = "First name must be between 2 and 50 characters")
    @Column(name = "first_name", nullable = false, length = 50)
    private String firstName;

    @NotBlank(message = "Last name is required")
    @Size(min = 2, max = 50, message = "Last name must be between 2 and 50 characters")
    @Column(name = "last_name", nullable = false, length = 50)
    private String lastName;

    @NotBlank(message = "Position is required")
    @Pattern(regexp = "^(Forward|Midfielder|Defender|Goalkeeper)$",
            message = "Position must be Forward, Midfielder, Defender, or Goalkeeper")
    @Column(name = "position", nullable = false, length = 20)
    private String position;

    @NotBlank(message = "Nationality is required")
    @Size(min = 2, max = 50, message = "Nationality must be between 2 and 50 characters")
    @Column(name = "nationality", nullable = false, length = 50)
    private String nationality;

    @NotBlank(message = "Preferred foot is required")
    @Pattern(regexp = "^(Right|Left|Both)$", message = "Preferred foot must be Right, Left, or Both")
    @Column(name = "preferred_foot", nullable = false, length = 10)
    private String preferredFoot;

    @NotNull(message = "Height is required")
    @Min(value = 150, message = "Height must be at least 150 cm")
    @Max(value = 230, message = "Height cannot exceed 230 cm")
    @Column(name = "height", nullable = false)
    private Integer height; // in centimeters

    @NotNull(message = "Weight is required")
    @Min(value = 50, message = "Weight must be at least 50 kg")
    @Max(value = 150, message = "Weight cannot exceed 150 kg")
    @Column(name = "weight", nullable = false)
    private Integer weight; // in kilograms

    @Min(value = 0, message = "Goals cannot be negative")
    @Max(value = 1000, message = "Goals cannot exceed 1000")
    @Column(name = "goals", nullable = false, columnDefinition = "INT DEFAULT 0")
    private Integer goals = 0;

    @Min(value = 0, message = "Assists cannot be negative")
    @Max(value = 1000, message = "Assists cannot exceed 1000")
    @Column(name = "assists", nullable = false, columnDefinition = "INT DEFAULT 0")
    private Integer assists = 0;

    @Min(value = 0, message = "Yellow cards cannot be negative")
    @Column(name = "yellow_cards", nullable = false, columnDefinition = "INT DEFAULT 0")
    private Integer yellowCards = 0;

    @Min(value = 0, message = "Red cards cannot be negative")
    @Column(name = "red_cards", nullable = false, columnDefinition = "INT DEFAULT 0")
    private Integer redCards = 0;

    @Min(value = 0, message = "Matches played cannot be negative")
    @Column(name = "matches_played", nullable = false, columnDefinition = "INT DEFAULT 0")
    private Integer matchesPlayed = 0;

    @Column(name = "jersey_number")
    @Min(value = 1, message = "Jersey number must be at least 1")
    @Max(value = 99, message = "Jersey number cannot exceed 99")
    private Integer jerseyNumber;

    @Size(max = 500, message = "Biography cannot exceed 500 characters")
    @Column(name = "bio", columnDefinition = "TEXT")
    private String bio;

    /**
     * Audit Columns
     */
    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    /**
     * Calculate average goals per match
     */
    public Double getGoalsPerMatch() {
        if (matchesPlayed == null || matchesPlayed == 0) {
            return 0.0;
        }
        return (double) goals / matchesPlayed;
    }

    /**
     * Calculate average assists per match
     */
    public Double getAssistsPerMatch() {
        if (matchesPlayed == null || matchesPlayed == 0) {
            return 0.0;
        }
        return (double) assists / matchesPlayed;
    }

    /**
     * Calculate BMI (Body Mass Index)
     */
    public Double getBMI() {
        if (height == null || height == 0) {
            return 0.0;
        }
        double heightInMeters = height / 100.0;
        return weight / (heightInMeters * heightInMeters);
    }

    /**
     * Get full name
     */
    public String getFullName() {
        return firstName + " " + lastName;
    }
}
