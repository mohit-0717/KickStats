package com.football.mapper;

import com.football.dto.CreatePlayerRequest;
import com.football.dto.PlayerDTO;
import com.football.entity.Player;
import org.mapstruct.BeanMapping;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.mapstruct.NullValuePropertyMappingStrategy;

@Mapper(componentModel = "spring")
public interface PlayerMapper {

    @Mapping(target = "bmi", expression = "java(player.getBMI())")
    @Mapping(target = "goalsPerMatch", expression = "java(player.getGoalsPerMatch())")
    @Mapping(target = "assistsPerMatch", expression = "java(player.getAssistsPerMatch())")
    @Mapping(target = "fullName", expression = "java(player.getFullName())")
    @Mapping(target = "createdAt", expression = "java(player.getCreatedAt() != null ? player.getCreatedAt().toString() : null)")
    @Mapping(target = "updatedAt", expression = "java(player.getUpdatedAt() != null ? player.getUpdatedAt().toString() : null)")
    PlayerDTO toDTO(Player player);

    @Mapping(target = "playerId", ignore = true)
    @Mapping(target = "goals", constant = "0")
    @Mapping(target = "assists", constant = "0")
    @Mapping(target = "yellowCards", constant = "0")
    @Mapping(target = "redCards", constant = "0")
    @Mapping(target = "matchesPlayed", constant = "0")
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "deletedAt", ignore = true)
    Player toEntity(CreatePlayerRequest request);

    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    @Mapping(target = "playerId", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "deletedAt", ignore = true)
    void updateEntity(PlayerDTO dto, @MappingTarget Player player);
}
