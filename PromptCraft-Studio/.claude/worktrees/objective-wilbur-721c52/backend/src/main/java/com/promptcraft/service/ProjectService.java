package com.promptcraft.service;

import com.promptcraft.dto.ProjectDTO;
import com.promptcraft.entity.Project;
import com.promptcraft.vo.ProjectVO;

import java.util.List;

public interface ProjectService {

    List<ProjectVO> listProjects(String keyword, String tagsFilter);

    ProjectVO getProjectById(Long id);

    Project createProject(ProjectDTO dto);

    Project updateProject(Long id, ProjectDTO dto);

    void deleteProject(Long id);

    void setStableVersion(Long projectId, Long versionId);
}
