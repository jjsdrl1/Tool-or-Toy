package com.promptcraft.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.promptcraft.entity.VariableSnapshot;
import org.apache.ibatis.annotations.Delete;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.util.List;

@Mapper
public interface VariableSnapshotMapper extends BaseMapper<VariableSnapshot> {

    @Select("SELECT * FROM variable_snapshot WHERE version_id = #{versionId} ORDER BY id DESC")
    List<VariableSnapshot> selectByVersionId(@Param("versionId") Long versionId);

    @Delete("DELETE FROM variable_snapshot WHERE version_id = #{versionId}")
    int deleteByVersionId(@Param("versionId") Long versionId);
}
