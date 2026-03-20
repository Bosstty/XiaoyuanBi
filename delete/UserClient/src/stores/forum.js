import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useForumStore = defineStore('forum', () => {
  const posts = ref([])
  const currentPost = ref(null)
  const categories = ref([
    { id: 'academic', name: '学术交流', icon: '📚' },
    { id: 'life', name: '生活服务', icon: '🏠' },
    { id: 'campus', name: '校园动态', icon: '🏫' },
    { id: 'task', name: '任务交流', icon: '💼' },
    { id: 'skill', name: '技能分享', icon: '💡' }
  ])

  function addPost(postData) {
    const post = {
      id: Date.now(),
      ...postData,
      createTime: new Date().toISOString(),
      likes: 0,
      comments: [],
      views: 0
    }
    posts.value.unshift(post)
    return post
  }

  function addComment(postId, commentData) {
    const post = posts.value.find(p => p.id === postId)
    if (post) {
      const comment = {
        id: Date.now(),
        ...commentData,
        createTime: new Date().toISOString(),
        likes: 0
      }
      post.comments.push(comment)
      return comment
    }
  }

  function likePost(postId) {
    const post = posts.value.find(p => p.id === postId)
    if (post) {
      post.likes += 1
    }
  }

  function getPostsByCategory(category) {
    return posts.value.filter(post => post.category === category)
  }

  function setCurrentPost(post) {
    currentPost.value = post
    if (post) {
      post.views += 1
    }
  }

  return {
    posts,
    currentPost,
    categories,
    addPost,
    addComment,
    likePost,
    getPostsByCategory,
    setCurrentPost
  }
})
