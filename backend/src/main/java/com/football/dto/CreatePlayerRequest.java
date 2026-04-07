package com.football.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreatePlayerRequest {

    @NotBlank(message = "First name is required")
    @Size(min = 2, max = 50)
    private String firstName;

    @NotBlank(message = "Last name is required")
    @Size(min = 2, max = 50)
    private String lastName;

    @NotBlank(message = "Position is required")
    @Pattern(regexp = "^(Forward|Midfielder|Defender|Goalkeeper)$")
    private String position;

    @NotBlank(message = "Nationality is required")
    private String nationality;

    @NotBlank(message = "Preferred foot is required")
    @Pattern(regexp = "^(Right|Left|Both)$")
    private String preferredFoot;

    @NotNull(message = "Height is required")
    @Min(150)
    @Max(230)
    private Integer height;

    @NotNull(message = "Weight is required")
    @Min(50)
    @Max(150)
    private Integer weight;

    @Min(1)
    @Max(99)
    private Integer jerseyNumber;

    @Size(max = 500)
    private String bio;
}
