package com.promptcraft.controller;

import com.promptcraft.common.ApiResult;
import com.promptcraft.dto.VariableSnapshotDTO;
import com.promptcraft.entity.VariableSnapshot;
import com.promptcraft.service.VariableSnapshotService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class VariableSnapshotController {

    private final VariableSnapshotService snapshotService;

    @GetMapping("/api/versions/{vid}/variable-snapshots")
    public ApiResult<List<VariableSnapshot>> list(@PathVariable Long vid) {
        return ApiResult.ok(snapshotService.listByVersion(vid));
    }

    @PostMapping("/api/versions/{vid}/variable-snapshots")
    public ApiResult<VariableSnapshot> create(@PathVariable Long vid,
                                              @Valid @RequestBody VariableSnapshotDTO dto) {
        return ApiResult.ok(snapshotService.create(vid, dto));
    }

    @DeleteMapping("/api/variable-snapshots/{id}")
    public ApiResult<Void> delete(@PathVariable Long id) {
        snapshotService.delete(id);
        return ApiResult.ok(null);
    }
}
