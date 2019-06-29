#!/usr/bin/env node
require("dotenv").config();
const axios = require("axios");

// Store Slack access token in a .env file in the root folder
// Your own user Id to prevent errors with self inviting
const accessToken = process.env.SLACK_ACCESS_TOKEN;
const myId = process.env.MY_ID;

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

  if (process.argv.length !== 4) {
    return console.log("Please supply a source channel and a target channel")
  }

  const sourceId = await getConversationId(sourceChannel)
  const targetId = await getConversationId(targetChannel)

  const sourceMembers = await getConversationMembers(sourceId)
  const targetMembers = await getConversationMembers(targetId)

  const membersToInvite = [...new Set([...sourceMembers, ...targetMembers])]
    .filter(member => !targetMembers.includes(member))

  console.log(membersToInvite.join("%2C"))

  while (membersToInvite.length > 0) {
    const batch = membersToInvite.splice(0, 20);

    console.log(batch)
    const result = await axios.post(`https://slack.com/api/conversations.invite?token=${accessToken}&channel=${targetId}&users=${batch.join('%2C')}`)
  }
}

inviteMembers(process.argv[2], process.argv[3])
