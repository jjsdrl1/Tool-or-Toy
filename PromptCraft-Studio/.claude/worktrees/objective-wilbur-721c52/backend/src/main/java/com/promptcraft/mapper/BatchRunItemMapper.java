package com.promptcraft.mapper;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.promptcraft.entity.BatchRunItem;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.util.Collection;
import java.util.List;

@Mapper
public interface BatchRunItemMapper extends BaseMapper<BatchRunItem> {

    @Select("SELECT * FROM batch_run_item WHERE batch_run_id = #{batchRunId} ORDER BY id ASC")
    List<BatchRunItem> selectByBatchRunId(@Param("batchRunId") Long batchRunId);

    /** Delete all items whose batch_run_id is in the given collection. Returns affected rows. */
    default int deleteByBatchRunIds(Collection<Long> batchRunIds) {
        if (batchRunIds == null || batchRunIds.isEmpty()) return 0;
        return delete(new LambdaQueryWrapper<BatchRunItem>().in(BatchRunItem::getBatchRunId, batchRunIds));
    }
}
