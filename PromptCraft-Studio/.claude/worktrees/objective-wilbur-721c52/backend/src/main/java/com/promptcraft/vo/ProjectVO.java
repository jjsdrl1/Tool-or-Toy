package com.promptcraft.vo;

import com.promptcraft.entity.Project;
import lombok.*;

@Data
@EqualsAndHashCode(callSuper = true)
@NoArgsConstructor
@AllArgsConstructor
public class ProjectVO extends Project {

    private int versionCount;

    private Integer stableVersionNo;
}
