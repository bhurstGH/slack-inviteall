#!/usr/bin/env node
require("dotenv").config();
const axios = require("axios");

// Store Slack access token in a .env file in the root folder
const accessToken = process.env.SLACK_ACCESS_TOKEN;

async function getConversationId(conversation) {

  // Trim the pound sign if it was provided in the conversation argument
  if (conversation.startsWith('#')) {
    conversation = conversation.slice(1)
  }

  // Destructuring to pull out the channels result from the response
  const { data: { channels } } = await axios.get(`https://slack.com/api/conversations.list?token=${accessToken}&pretty=1`)

  // Find the channel with matching conversation name and pull out its ID
  const conversationId = channels.find(chan => chan.name === conversation).id

  return conversationId
}

async function getConversationMembers(conversationId) {

  async function queryForMembers(membersCollection = [], nextCursor = '') {
    let allConversationMembers = [];

    // Base case: members exist, no next cursor, we've retrieved all the members
    if (membersCollection.length > 0 && !nextCursor) {
      return membersCollection;
    }

    try {
      const response = await axios.get(
        `https://slack.com/api/conversations.members?token=${accessToken}&channel=${conversationId}${nextCursor}`
      );

      let {
        data: {
          members,
          response_metadata: { next_cursor }
        }
      } = response;

      // Cursor seems to always end with =
      // Replace with URL encoding, %3D
      if (next_cursor) {
        next_cursor = `&cursor=${next_cursor.replace('=', '%3D')}`
      }

      // Combine previous member grouping with previous
      allConversationMembers = [...members, ...membersCollection]

      return await queryForMembers(allConversationMembers, next_cursor)
    }
    catch (err) {
      console.log(err);
    }

  }

  return await queryForMembers()
}

async function inviteMembers(sourceChannel, targetChannel) {

  const sourceId = await getConversationId(sourceChannel)
  const targetId = await getConversationId(targetChannel)

  const sourceMembers = await getConversationMembers(sourceId)

  console.log(`&users=${sourceMembers.join('%2C')}`)

  const result = await axios.post(`https://slack.com/api/conversations.invite?token=${accessToken}&channel=${targetId}&users=${sourceMembers.join('%2C')}`)

  console.log(result)
}

inviteMembers(process.argv[2], process.argv[3])