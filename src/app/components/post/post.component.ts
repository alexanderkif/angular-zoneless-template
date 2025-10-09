import { Component, Input } from '@angular/core';
import { Post } from '../../types/post';
import { Router } from '@angular/router';

@Component({
    selector: 'app-post',
    imports: [],
    templateUrl: './post.component.html',
    styleUrl: './post.component.css'
})
export class PostComponent {
  @Input() post?: Post;

  constructor(private router: Router) {}

  openDetails(id: number) {
    this.router.navigate([`/posts/${id}`]);
  }
}
