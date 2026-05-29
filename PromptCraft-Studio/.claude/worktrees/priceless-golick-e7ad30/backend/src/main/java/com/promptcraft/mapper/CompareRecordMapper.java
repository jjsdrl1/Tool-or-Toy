package com.promptcraft.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.promptcraft.entity.CompareRecord;
import com.promptcraft.vo.CompareRecordVO;
import org.apache.ibatis.annotations.Delete;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.util.List;

@Mapper
public interface CompareRecordMapper extends BaseMapper<CompareRecord> {

    @Select("SELECT cr.id, cr.project_id, cr.version_a_id, cr.version_b_id, " +
            "cr.run_a_id, cr.run_b_id, cr.winner_version_id, cr.reason, cr.created_at, " +
            "pva.version_no AS version_a_no, pvb.version_no AS version_b_no " +
            "FROM compare_record cr " +
            "LEFT JOIN prompt_version pva ON cr.version_a_id = pva.id " +
            "LEFT JOIN prompt_version pvb ON cr.version_b_id = pvb.id " +
            "WHERE cr.project_id = #{projectId} " +
            "ORDER BY cr.created_at DESC")
    List<CompareRecordVO> selectVOsByProjectId(@Param("projectId") Long projectId);

    @Delete("DELETE FROM compare_record WHERE version_a_id = #{versionId} OR version_b_id = #{versionId}")
    int deleteByVersionId(@Param("versionId") Long versionId);

    @Delete("DELETE FROM compare_record WHERE project_id = #{projectId}")
    int deleteByProjectId(@Param("projectId") Long projectId);
}
