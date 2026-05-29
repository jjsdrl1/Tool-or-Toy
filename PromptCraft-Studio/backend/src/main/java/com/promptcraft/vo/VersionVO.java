package com.promptcraft.vo;

import com.promptcraft.entity.PromptVersion;
import lombok.*;

@Data
@EqualsAndHashCode(callSuper = true)
@NoArgsConstructor
public class VersionVO extends PromptVersion {
    // Future extra fields (e.g. run statistics) will go here
}
