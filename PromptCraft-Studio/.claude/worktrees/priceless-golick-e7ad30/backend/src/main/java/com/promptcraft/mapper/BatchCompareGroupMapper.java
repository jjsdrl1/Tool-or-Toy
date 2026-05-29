package com.promptcraft.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.promptcraft.entity.BatchCompareGroup;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.util.List;

@Mapper
public interface BatchCompareGroupMapper extends BaseMapper<BatchCompareGroup> {

    @Select("SELECT * FROM batch_compare_group WHERE project_id = #{projectId} ORDER BY created_at DESC")
    List<BatchCompareGroup> selectByProjectId(@Param("projectId") Long projectId);
}
