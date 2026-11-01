import { Button } from "@/components/ui/button";
import { acceptInvitation, declineInvitation } from "@/app/account/actions";
import { roleLabel, type DutyholderRole } from "@/lib/labels";

export type Invitation = {
  member_id: string;
  project_id: string;
  project_name: string;
  project_address: string;
  role: DutyholderRole | null;
  invited_at: string;
  owner_name: string;
  owner_company: string;
};

// Places on other partners' projects, waiting for the person to say yes.
// Nothing about them is shared with that partner until they accept.
export function Invitations({ invitations }: { invitations: Invitation[] }) {
  return (
    <ul className="space-y-3">
      {invitations.map((i) => (
        <li key={i.member_id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4">
          <div className="min-w-0 text-sm">
            <p className="font-medium">{i.project_name}</p>
            <p className="text-muted-foreground">
              {i.owner_name}{i.owner_company && ` · ${i.owner_company}`} has invited you as the {roleLabel(i.role).toLowerCase()}
            </p>
            {i.project_address && <p className="text-xs text-muted-foreground">{i.project_address}</p>}
          </div>
          <div className="flex gap-2">
            <form action={acceptInvitation.bind(null, i.member_id)}>
              <Button type="submit">Accept</Button>
            </form>
            <form action={declineInvitation.bind(null, i.member_id)}>
              <Button type="submit" variant="outline">Decline</Button>
            </form>
          </div>
        </li>
      ))}
    </ul>
  );
}
