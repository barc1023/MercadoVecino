import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class SessionService {

  private role: string = 'cliente'

  getRole(): string {
    return this.role;
  }
}