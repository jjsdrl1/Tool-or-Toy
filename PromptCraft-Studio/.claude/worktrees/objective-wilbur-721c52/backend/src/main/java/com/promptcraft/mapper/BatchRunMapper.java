package com.promptcraft.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.promptcraft.entity.BatchRun;
import org.apache.ibatis.annotations.Delete;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Update;

import java.util.List;

@Mapper
public interface BatchRunMapper extends BaseMapper<BatchRun> {

    @Select("SELECT * FROM batch_run WHERE project_id = #{projectId} ORDER BY created_at DESC")
    List<BatchRun> selectByProjectId(@Param("projectId") Long projectId);

    @Select("SELECT * FROM batch_run WHERE compare_group_id = #{groupId} ORDER BY id ASC")
    List<BatchRun> selectByCompareGroupId(@Param("groupId") Long groupId);

    @Select("SELECT id FROM batch_run WHERE version_id = #{versionId}")
    List<Long> selectIdsByVersionId(@Param("versionId") Long versionId);

    @Select("SELECT id FROM batch_run WHERE project_id = #{projectId}")
    List<Long> selectIdsByProjectId(@Param("projectId") Long projectId);

    @Update("UPDATE batch_run SET success_count = success_count + 1 WHERE id = #{id}")
    void incrementSuccess(@Param("id") Long id);

    @Update("UPDATE batch_run SET failed_count = failed_count + 1 WHERE id = #{id}")
    void incrementFailed(@Param("id") Long id);

    @Delete("DELETE FROM batch_run WHERE version_id = #{versionId}")
    int deleteByVersionId(@Param("versionId") Long versionId);

    @Delete("DELETE FROM batch_run WHERE project_id = #{projectId}")
    int deleteByProjectId(@Param("projectId") Long projectId);
}
