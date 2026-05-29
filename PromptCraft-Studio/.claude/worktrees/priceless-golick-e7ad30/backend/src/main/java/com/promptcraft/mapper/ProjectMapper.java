package com.promptcraft.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.promptcraft.entity.Project;
import com.promptcraft.vo.ProjectVO;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface ProjectMapper extends BaseMapper<Project> {

    List<ProjectVO> selectProjectList(
            @Param("keyword") String keyword,
            @Param("tagsFilter") String tagsFilter
    );
}
