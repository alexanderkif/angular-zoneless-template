import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import { Post } from '../../services/post.service';

@Component({
  selector: 'app-post',
  imports: [],
  templateUrl: './post.component.html',
  styleUrl: './post.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PostComponent {
  @Input() post?: Post;
  @Input() isLoading = false;

  constructor(private router: Router) {}

  openDetails(id: number) {
    this.router.navigate([`/posts/${id}`]);
  }
}
