import { CommonModule } from '@angular/common';
import { Component, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Observable, switchMap } from 'rxjs';
import { PostService, Post } from '../../services/post.service';

@Component({
  selector: 'app-post-details',
  imports: [CommonModule, RouterLink],
  templateUrl: './post-details.component.html',
  styleUrl: './post-details.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PostDetailsComponent {
  public post$!: Observable<Post | null>;

  constructor(
    public actRoute: ActivatedRoute,
    private postService: PostService,
  ) {}

  ngOnInit(): void {
    this.post$ = this.actRoute.paramMap.pipe(
      switchMap((params) => this.postService.getPost(params.get('id'))),
    );
  }
}
