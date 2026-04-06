<?php

namespace App\Http\Controllers;

use App\Models\Friend;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FriendController extends Controller
{
    /** GET /api/friends */
    public function index(Request $request): JsonResponse
    {
        $friends = Friend::where('user_id', $request->user()->id)
            ->with('friend.settings')
            ->get();

        return response()->json($friends->map(fn ($f) => $this->format($f)));
    }

    /**
     * POST /api/friends
     * Body: { user_id: <numeric user id> }
     * The "share code" is simply the numeric user id for simplicity.
     */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'user_id' => 'required|integer|exists:users,id',
        ]);

        $friendUserId = (int) $data['user_id'];
        $userId       = $request->user()->id;

        if ($friendUserId === $userId) {
            return response()->json(['message' => 'Cannot add yourself.'], 422);
        }

        $existing = Friend::where('user_id', $userId)
            ->where('friend_id', $friendUserId)
            ->first();

        if ($existing) {
            return response()->json(['message' => 'Already added.'], 422);
        }

        $friend = Friend::create(['user_id' => $userId, 'friend_id' => $friendUserId]);

        return response()->json($this->format($friend->load('friend.settings')), 201);
    }

    /** DELETE /api/friends/{id} */
    public function destroy(Request $request, int $id): JsonResponse
    {
        Friend::where('user_id', $request->user()->id)
            ->where('friend_id', $id)
            ->firstOrFail()
            ->delete();

        return response()->json(null, 204);
    }

    private function format(Friend $f): array
    {
        $friend = $f->friend;
        return [
            'id'       => $friend->id,
            'username' => $friend->name,
            'email'    => $friend->email,
        ];
    }
}
