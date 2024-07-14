import { Component } from '@angular/core';
import { PostService } from '../../service/post.service';
import { CommonModule } from '@angular/common';
import { PostComponent } from "../../components/post/post.component";

@Component({
  selector: 'app-posts-list',
  standalone: true,
  imports: [CommonModule, PostComponent],
  templateUrl: './posts-list.component.html',
  styleUrl: './posts-list.component.scss'
})
export class PostsListComponent {
  constructor(private postService: PostService) {}
  
  public posts$ = this.postService.getPosts();

}
