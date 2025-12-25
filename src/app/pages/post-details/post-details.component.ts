import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { PostService } from '../../services/post.service';
import { Observable, switchMap } from 'rxjs';
import { Post } from '../../types/post';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-post-details',
  imports: [CommonModule],
  templateUrl: './post-details.component.html',
  styleUrl: './post-details.component.css',
})
export class PostDetailsComponent {
  public post$!: Observable<Post | null>;

  constructor(
    public actRoute: ActivatedRoute,
    private postService: PostService
  ) {}

  ngOnInit(): void {
    this.post$ = this.actRoute.paramMap.pipe(
      switchMap((params) => this.postService.getPost(params.get('id')))
    );
  }
}
