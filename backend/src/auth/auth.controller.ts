import { Controller, Post, Body, UseGuards, Get, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { IsString, IsNotEmpty } from 'class-validator';
import { AuthService } from './auth.service';

export class LoginDto {
  @IsString()
  @IsNotEmpty()
  code: string;
}

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto.code);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('profile')
  getProfile(@Request() req) {
    return req.user;
  }
}
