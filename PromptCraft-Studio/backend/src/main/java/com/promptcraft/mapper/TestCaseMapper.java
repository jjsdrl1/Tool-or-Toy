package com.promptcraft.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.promptcraft.entity.TestCase;
import org.apache.ibatis.annotations.Delete;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.util.List;

@Mapper
public interface TestCaseMapper extends BaseMapper<TestCase> {

    @Select("SELECT * FROM test_case WHERE project_id = #{projectId} ORDER BY id ASC")
    List<TestCase> selectByProjectId(@Param("projectId") Long projectId);

    @Delete("DELETE FROM test_case WHERE project_id = #{projectId}")
    int deleteByProjectId(@Param("projectId") Long projectId);
}
