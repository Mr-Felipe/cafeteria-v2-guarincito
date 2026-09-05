import { ChangeDetectionStrategy, Component, ViewChild, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { Header } from './components/header/header';
import { Sidebar } from './components/sidebar/sidebar';
import { Toast } from './components/toast/toast';

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterOutlet, Header, Sidebar, Toast],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  @ViewChild('sidebar') sidebarRef?: Sidebar;

  @HostListener('window:toggle-sidebar')
  onToggleSidebar(): void {
    this.sidebarRef?.toggleMobile();
  }
}
