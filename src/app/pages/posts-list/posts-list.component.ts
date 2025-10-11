import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PostComponent } from '../../components/post/post.component';
import { Store } from '@ngrx/store';
import { PostsUserActions } from '../../store/posts/actions';
import { PostState, selectIsLoading, selectPosts } from '../../store/posts/posts.reducer';
import { selectPostsLength } from '../../store/posts/posts.selector';

@Component({
  selector: 'app-posts-list',
  imports: [CommonModule, PostComponent],
  templateUrl: './posts-list.component.html',
  styleUrl: './posts-list.component.css',
})
export class PostsListComponent implements OnInit {
  private postStore = inject(Store<PostState>);
  readonly posts = this.postStore.selectSignal(selectPosts);
  readonly isLoading = this.postStore.selectSignal(selectIsLoading);
  readonly postsLength = this.postStore.selectSignal(selectPostsLength);

  constructor() {}

  ngOnInit(): void {
    this.postStore.dispatch(PostsUserActions.clearPosts());
    this.postStore.dispatch(PostsUserActions.loadPosts({ limit: 1 }));

    setTimeout(() => {
      this.postStore.dispatch(PostsUserActions.loadPosts({ limit: 3 }));
    }, 3000);

    setTimeout(() => {
      this.postStore.dispatch(PostsUserActions.loadPosts({ limit: 5 }));
    }, 5000);
  }
}
