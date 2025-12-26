import { Component, Input } from '@angular/core';
import { Post } from '../../services/post.service';
import { Router } from '@angular/router';

@Component({
    selector: 'app-post',
    imports: [],
    templateUrl: './post.component.html',
    styleUrl: './post.component.css'
})
export class PostComponent {
  @Input() post?: Post;
  @Input() isLoading = false;

  constructor(private router: Router) {}

  openDetails(id: number) {
    this.router.navigate([`/posts/${id}`]);
  }
}
