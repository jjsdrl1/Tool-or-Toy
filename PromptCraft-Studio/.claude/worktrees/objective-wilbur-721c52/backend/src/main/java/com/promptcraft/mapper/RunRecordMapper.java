package com.promptcraft.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.promptcraft.entity.RunRecord;
import org.apache.ibatis.annotations.Delete;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.util.List;

@Mapper
public interface RunRecordMapper extends BaseMapper<RunRecord> {

    @Select("SELECT * FROM run_record WHERE project_id = #{projectId} ORDER BY created_at DESC LIMIT 50")
    List<RunRecord> selectByProjectId(@Param("projectId") Long projectId);

    @Select("SELECT * FROM run_record WHERE version_id = #{versionId} ORDER BY created_at DESC LIMIT 20")
    List<RunRecord> selectByVersionId(@Param("versionId") Long versionId);

    @Delete("DELETE FROM run_record WHERE version_id = #{versionId}")
    int deleteByVersionId(@Param("versionId") Long versionId);

    @Delete("DELETE FROM run_record WHERE project_id = #{projectId}")
    int deleteByProjectId(@Param("projectId") Long projectId);
}
