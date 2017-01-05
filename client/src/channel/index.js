import { Socket } from 'phoenix-elixir'
import router from '../router'
import store from '../store'
import { socketURL } from '../utils'
import uniqueId from 'uniqid'
import * as types from '../store/mutation-types'

const isPostInStore = postId => {
  return store.getters.posts
    .find(post => post.id === postId)
}

const isInPostRoute = postId => {
  return store.getters.routeParams.postId == postId
}

const isInBestRoute = () => {
  return store.state.route.name === 'best'
}

const isInHomeRoute = () => {
  return store.state.route.name === 'home'
}

const isInLatestRoute = () => {
  return store.state.route.name === 'latest'
}

export const socket = new Socket(socketURL)

export const joinUserChannel = ({ id, jwt }) => {
  let userChannel = socket.channel(`users:${id}`, { token: jwt })

  userChannel.join()
    .receive('ok', _ => {
      store.dispatch('addAlert', {
        id: uniqueId('alert_'),
        type: 'success',
        message: 'User joined succesfully!'
      })
    })

  userChannel.on('user:add_notification', notification => {
    store.commit(types.ADD_NOTIFICATION, notification)
    store.dispatch('addAlert', {
      id: uniqueId('alert_'),
      type: 'info',
      notification: notification,
      message: `${notification.username} commented in your post`
    })
  })

  userChannel.on('user:delete_notification', _ => {
    store.dispatch('getNotifications')
  })

  return userChannel
}

export const joinPostsChannel = () => {
  const postsChannel = socket.channel('posts:lobby')

  postsChannel.join()
    .receive('ok', _ => {
      console.log('joined succesfully to posts:lobby')
    })

  postsChannel.on('posts:add_post', post => {
    if(isInBestRoute()) {
      store.dispatch('getPosts', {
        limit: store.getters.routeParams.limit,
        by: 'most_upvoted'
      })
    }
    if(isInHomeRoute() || isInLatestRoute()) {
      store.dispatch('getPosts', {limit: store.getters.routeParams.limit})
    }
  })

  postsChannel.on('posts:update_post', post => {
    if(isPostInStore(post.id)) {
      store.commit(types.UPDATE_POST, post)
    }
    if(isInPostRoute(post.id)) {
      store.commit(types.SET_CURRENT_POST, post)
    }
  })

  postsChannel.on('posts:delete_post', post => {
    const { currentUser } = store.getters
    if(isInPostRoute(post.id)) {
      if ((currentUser && currentUser.id) !== post.user_id) {
        store.dispatch('addAlert', {
          id: uniqueId('alert_'),
          type: 'danger',
          message: 'The post you were looking was deleted by its author 😓'
        })
      }
      router.push('/')
    }
    if(isInBestRoute()) {
      store.dispatch('getPosts', {
        limit: store.getters.routeParams.limit,
        by: 'most_upvoted'
      })
    }
    if(isInHomeRoute() || isInLatestRoute()) {
      store.dispatch('getPosts', {limit: store.getters.routeParams.limit})
    }
  })

  postsChannel.on('posts:add_comment', comment => {
    if(isPostInStore(comment.post_id)) {
      store.commit(types.ADD_COMMENT, comment)
    }
    if(isInPostRoute(comment.post_id)) {
      store.commit(types.ADD_COMMENT_IN_CURRENT_POST, comment)
    }
  })

  postsChannel.on('posts:update_comment', comment => {
    if(isPostInStore(comment.post_id)) {
      store.commit(types.UPDATE_COMMENT, comment)
    }
    if(isInPostRoute(comment.post_id)) {
      store.commit(types.UPDATE_COMMENT_IN_CURRENT_POST, comment)
    }
  })

  postsChannel.on('posts:delete_comment', comment => {
    if(isPostInStore(comment.post_id)) {
      store.commit(types.DELETE_COMMENT, comment)
    }
    if(isInPostRoute(comment.post_id)) {
      store.commit(types.DELETE_COMMENT_IN_CURRENT_POST, comment)
    }
  })

  postsChannel.on('posts:upvote_post', vote => {
    if(isPostInStore(vote.post_id)) {
      store.commit(types.UPVOTE_POST, vote)
    }
    if(isInPostRoute(vote.post_id)) {
      store.commit(types.UPVOTE_POST_IN_CURRENT_POST, vote)
    }
    if(isInBestRoute()) {
      store.dispatch('getPosts', {
        limit: store.getters.routeParams.limit,
        by: 'most_upvoted'
      })
    }
  })

  postsChannel.on('posts:downvote_post', vote => {
    if(isPostInStore(vote.post_id)) {
      store.commit(types.DOWNVOTE_POST, vote)
    }
    if(isInPostRoute(vote.post_id)) {
      store.commit(types.DOWNVOTE_POST_IN_CURRENT_POST, vote)
    }
    if(isInBestRoute()) {
      store.dispatch('getPosts', {
        limit: store.getters.routeParams.limit,
        by: 'most_upvoted'
      })
    }
  })

  return postsChannel
}
