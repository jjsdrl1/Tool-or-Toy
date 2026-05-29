package com.promptcraft.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.promptcraft.entity.ApiPreset;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface ApiPresetMapper extends BaseMapper<ApiPreset> {
    // 使用 MyBatis-Plus 内置方法，无需自定义 SQL
}
