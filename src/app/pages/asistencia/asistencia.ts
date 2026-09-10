import { ChangeDetectionStrategy, Component } from '@angular/core';
import { UploadSectionComponent } from '../../components/upload-section/upload-section';
import { MonthlyMatrixComponent } from '../../components/monthly-matrix/monthly-matrix';

@Component({
  selector: 'app-asistencia',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [UploadSectionComponent, MonthlyMatrixComponent],
  template: `
    <main class="max-w-7xl mx-auto">
      <app-upload-section />
      <app-monthly-matrix />
    </main>
  `
})
export class Asistencia {}
