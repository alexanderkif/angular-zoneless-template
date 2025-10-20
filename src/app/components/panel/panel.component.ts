import { Component, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { Store } from '@ngrx/store';
import { UserState } from '../../store/users/users.reducer';
import { selectIsGuest } from '../../store/users/users.selector';

@Component({
  selector: 'app-panel',
  imports: [RouterModule],
  templateUrl: './panel.component.html',
  styleUrl: './panel.component.css',
})
export class PanelComponent {
  private userStore = inject(Store<UserState>);
  public isGuest = this.userStore.selectSignal(selectIsGuest);
}
