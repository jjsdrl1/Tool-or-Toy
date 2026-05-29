package com.promptcraft.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.promptcraft.entity.PromptVersion;
import org.apache.ibatis.annotations.Delete;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Update;

import java.util.List;

@Mapper
public interface PromptVersionMapper extends BaseMapper<PromptVersion> {

    @Select("SELECT MAX(version_no) FROM prompt_version WHERE project_id = #{projectId}")
    Integer selectMaxVersionNo(@Param("projectId") Long projectId);

    /** 将某项目所有版本的 status 批量重置（stable 流程第②步） */
    @Update("UPDATE prompt_version SET status = #{status} WHERE project_id = #{projectId}")
    void updateStatusByProjectId(
            @Param("projectId") Long projectId,
            @Param("status") String status
    );

    @Select("SELECT id FROM prompt_version WHERE project_id = #{projectId}")
    List<Long> selectIdsByProjectId(@Param("projectId") Long projectId);

    @Delete("DELETE FROM prompt_version WHERE project_id = #{projectId}")
    int deleteByProjectId(@Param("projectId") Long projectId);
}
