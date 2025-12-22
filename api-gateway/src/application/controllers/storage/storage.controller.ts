import { 
  Controller, 
  Get, 
  Param, 
  NotFoundException, 
  HttpException, 
  HttpStatus,
  StreamableFile,
  Header,
} from '@nestjs/common';
import { Public } from '../../../infrastructure/libs/decorators/public.decorator';
import { ApiController } from '../../../infrastructure/libs/swagger/api-docs.decorator';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { Readable } from 'stream';

@ApiController('Storage')
@Controller('storage')
export class StorageController {
  private readonly laravelUrl = process.env.LARAVEL_URL || 'http://admin-service';

  constructor(private readonly httpService: HttpService) {}

  @Public()
  @Get('images/:path(*)')
  @ApiOperation({ summary: 'Proxy image from Laravel storage' })
  @ApiResponse({ status: 200, description: 'Image file' })
  @ApiResponse({ status: 404, description: 'Image not found' })
  @Header('Cache-Control', 'public, max-age=31536000')
  async getImage(@Param('path') path: string): Promise<StreamableFile> {
    try {
      const imageUrl = `${this.laravelUrl}/storage/${path}`;
      const response = await firstValueFrom(
        this.httpService.get(imageUrl, {
          responseType: 'stream',
          timeout: 10000,
        }),
      );

      const stream = Readable.from(response.data);
      return new StreamableFile(stream, {
        type: response.headers['content-type'] || 'image/jpeg',
      });
    } catch (error: any) {
      if (error.response?.status === 404) {
        throw new NotFoundException('Image not found');
      }
      throw new HttpException('Failed to fetch image', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Public()
  @Get('product-image/:path(*)')
  @ApiOperation({ summary: 'Get product image (proxy from Laravel)' })
  @ApiResponse({ status: 200, description: 'Product image file' })
  @ApiResponse({ status: 404, description: 'Image not found' })
  @Header('Cache-Control', 'public, max-age=31536000')
  async getProductImage(@Param('path') path: string): Promise<StreamableFile> {
    try {
      const imageUrl = `${this.laravelUrl}/storage/products/${path}`;
      const response = await firstValueFrom(
        this.httpService.get(imageUrl, {
          responseType: 'stream',
          timeout: 10000,
        }),
      );

      const stream = Readable.from(response.data);
      return new StreamableFile(stream, {
        type: response.headers['content-type'] || 'image/jpeg',
      });
    } catch (error: any) {
      if (error.response?.status === 404) {
        throw new NotFoundException('Product image not found');
      }
      throw new HttpException('Failed to fetch product image', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
