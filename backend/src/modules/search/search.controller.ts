import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { SearchService, SearchResult } from './search.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Search')
@Controller('search')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @ApiOperation({ summary: 'Tìm kiếm toàn cục (Workspace, Board, Card)' })
  @ApiQuery({ name: 'q', required: false, type: String, description: 'Từ khóa tìm kiếm' })
  @ApiResponse({ status: 200, description: 'Kết quả tìm kiếm' })
  async search(
    @CurrentUser('id') userId: string,
    @Query('q') query?: string,
  ): Promise<SearchResult> {
    return this.searchService.globalSearch(userId, query || '');
  }
}
