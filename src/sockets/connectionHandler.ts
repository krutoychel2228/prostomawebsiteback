import { Socket } from 'socket.io'
import { NotificationModel } from '../mongoose/schemas/Notification' // Adjust path as needed

export const handleSocketConnection = async (socket: Socket) => {
    const userId = socket.data.userId;
    if (!userId) {
        return socket.disconnect(true);
    }

    console.log(`User ${userId} connected to WebSocket`);

    // Join user-specific room
    socket.join(userId);

    try {
        // Get unread notification count for this user
        const unreadCount = await NotificationModel.countDocuments({
            recipientId: userId,
            read: false
        });

        // Send initial count to the connected client
        socket.emit('notification_count', { count: unreadCount });

        // You could also send the actual notifications if needed
        // const notifications = await Notification.find({ recipientId: userId, read: false })
        //     .sort({ createdAt: -1 })
        //     .limit(20)
        //     .populate('senderId', 'username profilePicture');
        // socket.emit('notifications_list', { notifications });

    } catch (error) {
        console.error('Error fetching notification count:', error);
        // Optionally send an error message to the client
        socket.emit('notification_error', { message: 'Could not load notifications' });
    }

    // Handle disconnection
    socket.on('disconnect', () => {
        console.log(`User ${userId} disconnected`);
    });

    // Handle errors
    socket.on('error', (err) => {
        console.error('Socket error:', err);
    });

    // Handle count refresh requests
    socket.on('get_notification_count', async () => {
        try {
            const count = await NotificationModel.countDocuments({
                recipientId: userId,
                read: false
            });
            socket.emit('notification_count', { count });
        } catch (error) {
            console.error('Error refreshing notification count:', error);
        }
    });

    // You could add more event handlers here, for example:
    // socket.on('mark_as_read', handleMarkAsRead);
};